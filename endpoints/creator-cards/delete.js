const { createHandler } = require('@app-core/server');
const deleteCreatorCardService = require('@app/services/creator-cards/delete-card');

module.exports = createHandler({
  path: '/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const payload = {
      slug: rc.params.slug,
      creator_reference: rc.body.creator_reference,
    };

    const response = await deleteCreatorCardService(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Deleted Successfully.',
      data: response,
    };
  },
});
