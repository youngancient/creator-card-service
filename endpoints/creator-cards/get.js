const { createHandler } = require('@app-core/server');
const getCreatorCardService = require('@app/services/creator-cards/get-card');

module.exports = createHandler({
  path: '/:slug',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = {
      slug: rc.params.slug,
      access_code: rc.query.access_code,
    };

    const response = await getCreatorCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Retrieved Successfully.',
      data: response,
    };
  },
});
