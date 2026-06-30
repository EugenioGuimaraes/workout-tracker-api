// E2E tests for auth module — to be implemented in the auth step (step 4)
// Uses Testcontainers (real Postgres) and Supertest
describe('Auth (e2e)', () => {
  it.todo('POST /auth/signup creates a new user');
  it.todo('POST /auth/login returns access + refresh token');
  it.todo('POST /auth/refresh rotates tokens');
  it.todo('POST /auth/logout revokes current refresh token');
  it.todo('POST /auth/logout-all revokes all refresh tokens');
  it.todo(
    'POST /auth/refresh with reused revoked token triggers cascade revocation',
  );
});
