import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request) => {
    const userIdHeader = request.headers['x-user-id'];
    const roleHeader = request.headers['x-user-role'];

    if (typeof userIdHeader !== 'string' || !userIdHeader) return;

    const role = roleHeader === 'admin' ? 'admin' : 'user';

    request.user = { id: userIdHeader, role };

    await app.prisma.user.upsert({
      where: { id: userIdHeader },
      update: { role },
      create: { id: userIdHeader, role }
    });
  });
};

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return;
  }
}

export function requireRole(role: 'admin' | 'user') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      await reply.code(401).send({ error: 'UNAUTHENTICATED' });
      return;
    }

    if (request.user.role !== role) {
      await reply.code(403).send({ error: 'FORBIDDEN' });
      return;
    }
  };
}
