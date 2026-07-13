export default {
  async fetch(request, env, ctx) {
    return new Response('OK from shenlun-worker ' + new Date().toISOString(), { status: 200 });
  },
  async scheduled(event, env, ctx) {
    console.log('Cron triggered at', new Date().toISOString());
  }
};
