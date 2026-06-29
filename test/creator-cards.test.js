const { expect } = require('chai');
const httpMocks = require('node-mocks-http');
const CreatorCard = require('../models/creator-card');
const createEndpoint = require('../endpoints/creator-cards/create');
const getEndpoint = require('../endpoints/creator-cards/get');
const deleteEndpoint = require('../endpoints/creator-cards/delete');

// We will manually mock the Mongoose model methods for the tests
const originalCreate = CreatorCard.create;
const originalFindOne = CreatorCard.findOne;

describe('Creator Card API Tests', () => {
  let mockDb = {}; // Mock database state

  beforeEach(() => {
    mockDb = {};

    // Mock CreatorCard.create
    CreatorCard.create = async (data) => {
      const newCard = {
        ...data,
        _id: 'mock_ulid_123',
        toObject: () => ({ ...data, _id: 'mock_ulid_123' }),
      };
      mockDb[data.slug] = newCard;
      return newCard;
    };

    // Mock CreatorCard.findOne
    CreatorCard.findOne = (query) => {
      let result = mockDb[query.slug] || null;
      if (
        result &&
        query.creator_reference &&
        result.creator_reference !== query.creator_reference
      ) {
        result = null;
      }
      const doc = {
        ...result,
        lean: async () => result,
        async save() {
          mockDb[query.slug] = Object.assign(result, this);
          return this;
        },
        toObject() {
          const { lean, save, toObject, ...data } = this;
          return data;
        },
      };
      return doc;
    };
  });

  afterEach(() => {
    CreatorCard.create = originalCreate;
    CreatorCard.findOne = originalFindOne;
  });

  describe('POST /creator-cards (Creation)', () => {
    it('should create a card successfully with valid payload', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/creator-cards',
        body: {
          title: 'George Cooks',
          description: 'Weekly cooking podcast',
          slug: 'george-cooks',
          creator_reference: 'crt_8f2k1m9x4p7w3q5z',
          status: 'published',
        },
      });

      const response = await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });

      expect(response.status).to.equal(200);
      expect(response.data.slug).to.equal('george-cooks');
      expect(response.data.access_type).to.equal('public');
      expect(response.data.access_code).to.equal(null);
      expect(response.data).to.have.property('id');
      expect(response.data).to.not.have.property('_id');
    });

    it('should auto-generate slug if omitted', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/creator-cards',
        body: {
          title: 'Ada Designs Things',
          creator_reference: 'crt_a1b2c3d4e5f6g7h8',
          status: 'published',
        },
      });

      const response = await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });

      expect(response.status).to.equal(200);
      expect(response.data.slug).to.equal('ada-designs-things');
    });

    it('should append random suffix if slug is taken', async () => {
      mockDb['ada-designs-things'] = { slug: 'ada-designs-things' }; // Pre-populate
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/creator-cards',
        body: {
          title: 'Ada Designs Things',
          creator_reference: 'crt_a1b2c3d4e5f6g7h8',
          status: 'published',
        },
      });

      const response = await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });

      expect(response.status).to.equal(200);
      expect(response.data.slug).to.match(/^ada-designs-things-[a-z0-9]{6}$/);
    });

    it('should fail with SL02 if provided slug is duplicate', async () => {
      mockDb['george-cooks'] = { slug: 'george-cooks' }; // Pre-populate

      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/creator-cards',
        body: {
          title: 'Another George',
          slug: 'george-cooks',
          creator_reference: 'crt_m1n2b3v4c5x6z7l8',
          status: 'published',
        },
      });

      try {
        await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('SL02');
      }
    });

    it('should create private card with access_code', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        body: {
          title: 'VIP Rate Card',
          creator_reference: 'crt_x9y8z7w6v5u4t3s2',
          status: 'published',
          access_type: 'private',
          access_code: 'A1B2C3',
        },
      });

      const response = await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });

      expect(response.status).to.equal(200);
      expect(response.data.access_code).to.equal('A1B2C3');
      expect(response.data).to.have.property('id');
      expect(response.data).to.not.have.property('_id');
    });

    it('should fail with AC01 if private card is missing access_code', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        body: {
          title: 'Secret Card',
          creator_reference: 'crt_q1w2e3r4t5y6u7i8',
          status: 'published',
          access_type: 'private',
        },
      });

      try {
        await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('AC01');
      }
    });

    it('should fail with AC05 if public card has access_code', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        body: {
          title: 'Public Card',
          creator_reference: 'crt_q1w2e3r4t5y6u7i8',
          status: 'published',
          access_type: 'public',
          access_code: 'A1B2C3',
        },
      });

      try {
        await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('AC05');
      }
    });

    it('should fail with validation error if status enum is invalid', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        body: {
          title: 'Bad Status Card',
          creator_reference: 'crt_q1w2e3r4t5y6u7i8',
          status: 'archived',
        },
      });

      try {
        await createEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('VALIDATION_ERROR');
        expect(err.details.status).to.include('archived is not a valid status');
      }
    });
  });

  describe('GET /creator-cards/:slug (Retrieval)', () => {
    beforeEach(() => {
      mockDb['george-cooks'] = {
        _id: '1',
        slug: 'george-cooks',
        status: 'published',
        access_type: 'public',
        deleted: null,
      };
      mockDb['draft-card'] = {
        _id: '2',
        slug: 'draft-card',
        status: 'draft',
        access_type: 'public',
        deleted: null,
      };
      mockDb['vip-card'] = {
        _id: '3',
        slug: 'vip-card',
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
        deleted: null,
      };
      mockDb['deleted-card'] = {
        _id: '4',
        slug: 'deleted-card',
        status: 'published',
        access_type: 'public',
        deleted: Date.now(),
      };
    });

    it('should retrieve a public published card successfully', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        params: { slug: 'george-cooks' },
        query: {},
      });

      const response = await getEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });

      expect(response.status).to.equal(200);
      expect(response.data.slug).to.equal('george-cooks');
      expect(response.data).to.not.have.property('access_code');
      expect(response.data).to.have.property('id');
      expect(response.data).to.not.have.property('_id');
    });

    it('should fail with NF01 if card does not exist', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        params: { slug: 'does-not-exist' },
        query: {},
      });

      try {
        await getEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('NF01');
      }
    });

    it('should fail with NF01 if card is deleted', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        params: { slug: 'deleted-card' },
        query: {},
      });

      try {
        await getEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('NF01');
      }
    });

    it('should fail with NF02 if card is draft', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        params: { slug: 'draft-card' },
        query: {},
      });

      try {
        await getEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('NF02');
      }
    });

    it('should fail with AC03 if private card requested without pin', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        params: { slug: 'vip-card' },
        query: {},
      });

      try {
        await getEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('AC03');
      }
    });

    it('should fail with AC04 if private card requested with wrong pin', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        params: { slug: 'vip-card' },
        query: { access_code: 'WRONG1' },
      });

      try {
        await getEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('AC04');
      }
    });

    it('should succeed if private card requested with correct pin', async () => {
      const req = httpMocks.createRequest({
        method: 'GET',
        params: { slug: 'vip-card' },
        query: { access_code: 'A1B2C3' },
      });

      const response = await getEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });

      expect(response.status).to.equal(200);
      expect(response.data.slug).to.equal('vip-card');
      expect(response.data).to.not.have.property('access_code');
      expect(response.data).to.have.property('id');
      expect(response.data).to.not.have.property('_id');
    });
  });

  describe('DELETE /creator-cards/:slug (Deletion)', () => {
    beforeEach(() => {
      mockDb['ada-designs'] = {
        _id: '1',
        slug: 'ada-designs',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
        deleted: null,
      };
    });

    it('should delete a card successfully', async () => {
      const req = httpMocks.createRequest({
        method: 'DELETE',
        params: { slug: 'ada-designs' },
        body: { creator_reference: 'crt_a1b2c3d4e5f6g7h8' },
      });

      const response = await deleteEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });

      expect(response.status).to.equal(200);
      expect(response.data.deleted).to.not.equal(null);
      expect(response.data.access_code).to.equal(null);
      expect(response.data).to.have.property('id');
      expect(response.data).to.not.have.property('_id');

      // verify it's marked as deleted in DB
      expect(mockDb['ada-designs'].deleted).to.not.equal(null);
    });

    it('should fail with NF01 if deleting non-existent card', async () => {
      const req = httpMocks.createRequest({
        method: 'DELETE',
        params: { slug: 'does-not-exist' },
        body: { creator_reference: 'crt_a1b2c3d4e5f6g7h8' },
      });

      try {
        await deleteEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('NF01');
      }
    });

    it('should fail with NF01 if creator_reference does not match', async () => {
      const req = httpMocks.createRequest({
        method: 'DELETE',
        params: { slug: 'ada-designs' },
        body: { creator_reference: 'wrong_reference_1234' },
      });

      try {
        await deleteEndpoint.handler(req, { http_statuses: { HTTP_200_OK: 200 } });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.errorCode).to.equal('NF01');
      }
    });
  });
});
