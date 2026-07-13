export default {
  async fetch(request, env) {
    return new Response('shenlun-crawler OK ' + new Date().toISOString(), { status: 200 });
  }
};
