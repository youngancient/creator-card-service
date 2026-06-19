const { createHandler } = require('@app-core/server');
const createCreatorCardService = require('@app/services/creator-cards/create-card');

module.exports = createHandler({
  path: '',
  method: 'post',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = rc.body;
    const response = await createCreatorCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Created Successfully.',
      data: response,
    };
  },
});
