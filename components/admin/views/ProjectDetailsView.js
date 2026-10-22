import ViewField, { ViewFieldGrid } from './ViewField';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  'on-hold': 'On hold',
  completed: 'Completed',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectDetailsView({ project }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ViewFieldGrid>
        <ViewField label="Address" value={project.address} />
        <ViewField label="Project type" value={project.project_type} />
        <ViewField label="Status" value={STATUS_LABELS[project.status] || project.status} />
        <ViewField label="Progress" value={`${project.progress_pct ?? 0}%`} />
        <ViewField label="Start date" value={formatDate(project.started_on)} />
        <ViewField label="Est. completion" value={formatDate(project.estimated_completion)} />
      </ViewFieldGrid>
      <ViewFieldGrid>
        <ViewField label="APN / Parcel number" value={project.apn} />
        <ViewField label="Jurisdiction" value={project.jurisdiction} />
        <ViewField label="Zoning" value={project.zoning} />
        <ViewField label="Lot size" value={project.lot_size} />
        <ViewField label="Building size" value={project.building_size} />
        <ViewField label="Room scanner" value={project.room_scanner_enabled ? 'Enabled for client' : 'Off'} />
      </ViewFieldGrid>
    </div>
  );
}
