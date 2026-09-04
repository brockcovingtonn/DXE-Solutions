// Minimal stand-in for the Supabase JS client, used to unit test API route
// auth guards without hitting a real database. Every query-builder method
// (select/insert/update/delete/eq/order/...) returns the same chainable
// object, which resolves to a configured response either when `.single()`
// is called or when the chain itself is awaited directly.
//
// `responses` maps table name -> a response, an array of responses consumed
// in call order (for routes that query the same table more than once with
// different intent, e.g. `getViewableProject`), or a function of call index.
export function createFakeSupabase({ user = null, responses = {}, signedUrl = 'https://example.com/signed-url' } = {}) {
  const counters = {};

  function nextResponse(table) {
    const config = responses[table];
    const i = counters[table] || 0;
    counters[table] = i + 1;

    if (config === undefined) return { data: null, error: null };
    if (typeof config === 'function') return config(i);
    if (Array.isArray(config)) return config[Math.min(i, config.length - 1)];
    return config;
  }

  function makeBuilder(table) {
    const builder = {};
    const passthrough = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'order', 'limit',
    ];
    passthrough.forEach((method) => {
      builder[method] = () => builder;
    });
    builder.single = () => Promise.resolve(nextResponse(table));
    builder.maybeSingle = () => Promise.resolve(nextResponse(table));
    builder.then = (resolve, reject) => Promise.resolve(nextResponse(table)).then(resolve, reject);
    return builder;
  }

  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from(table) {
      return makeBuilder(table);
    },
    storage: {
      from() {
        return {
          createSignedUrl: async () => ({ data: { signedUrl }, error: null }),
        };
      },
    },
  };
}

export function fakeRequest(body = {}) {
  return { json: async () => body };
}

export function fakeGetRequest(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return { url: `http://localhost/api/messages/thread${qs ? `?${qs}` : ''}` };
}
