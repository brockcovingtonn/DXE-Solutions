import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  notifyAdminOfUpcomingPayment,
  notifyAdminOfUnconfirmedPayment,
  sendScheduledInvoiceEmail,
} from '@/lib/email-notifications';

const REMINDER_THRESHOLDS = [
  { days: 30, column: 'reminder_30_sent_at' },
  { days: 14, column: 'reminder_14_sent_at' },
  { days: 7, column: 'reminder_7_sent_at' },
  { days: 3, column: 'reminder_3_sent_at' },
];

function daysUntil(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due - today) / 86400000);
}

// Runs once a day via pg_cron (see payment_schedule_migration.sql).
// Sends admin reminders at T-30/14/7/3 days for each scheduled
// milestone, then on/after the due date either auto-creates and sends
// the invoice (if the admin confirmed the schedule) or alerts the
// admin that it did NOT send because it was never confirmed.
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: items } = await admin
    .from('payment_schedule_items')
    .select('*, projects(name, owner_id, profiles!projects_owner_id_fkey(email, first_name, last_name, email_notifications))')
    .eq('status', 'scheduled');

  let remindersSent = 0;
  let invoicesSent = 0;
  let missedAlerts = 0;

  for (const item of items || []) {
    const project = item.projects;
    // Undated milestones (priced against an event, not a calendar
    // date — e.g. "upon utility completion") are tracked but never
    // auto-remind or auto-invoice; the admin sends those manually.
    if (!project || !item.due_date) continue;
    const daysOut = daysUntil(item.due_date);

    if (daysOut <= 0) {
      if (item.confirmed_at) {
        const { data: invoice, error: invoiceError } = await admin
          .from('invoices')
          .insert({
            project_id: item.project_id,
            kind: 'invoice',
            description: item.description,
            amount: item.amount,
            status: 'unpaid',
            due_date: item.due_date,
            visible_to_client: true,
            created_by: item.confirmed_by || item.created_by,
          })
          .select()
          .single();

        if (!invoiceError && invoice) {
          await admin
            .from('payment_schedule_items')
            .update({ status: 'invoiced', invoice_id: invoice.id })
            .eq('id', item.id);

          if (project.profiles?.email) {
            await sendScheduledInvoiceEmail({
              clientEmail: project.profiles.email,
              clientNotificationsEnabled: project.profiles.email_notifications,
              clientName: `${project.profiles.first_name || ''} ${project.profiles.last_name || ''}`.trim(),
              projectName: project.name,
              projectId: item.project_id,
              description: item.description,
              amount: item.amount,
            });
          }
          invoicesSent += 1;
        }
      } else if (!item.missed_alert_sent_at) {
        await notifyAdminOfUnconfirmedPayment({
          projectName: project.name,
          projectId: item.project_id,
          description: item.description,
          amount: item.amount,
          dueDate: item.due_date,
        });
        await admin
          .from('payment_schedule_items')
          .update({ missed_alert_sent_at: new Date().toISOString() })
          .eq('id', item.id);
        missedAlerts += 1;
      }
      continue;
    }

    const threshold = REMINDER_THRESHOLDS.find((t) => t.days === daysOut);
    if (threshold && !item[threshold.column]) {
      await notifyAdminOfUpcomingPayment({
        projectName: project.name,
        projectId: item.project_id,
        description: item.description,
        amount: item.amount,
        dueDate: item.due_date,
        daysOut: threshold.days,
      });
      await admin
        .from('payment_schedule_items')
        .update({ [threshold.column]: new Date().toISOString() })
        .eq('id', item.id);
      remindersSent += 1;
    }
  }

  return NextResponse.json({ success: true, checked: items?.length || 0, remindersSent, invoicesSent, missedAlerts });
}
