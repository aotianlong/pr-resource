import Post from '@/resources/post';

describe('routes mod', () => {
  it('toRoutes shold return a list of valid route items', () => {
    const routes = Post.toRoutes();
    const homeRoutes = Post.toHomeRoutes();
    const adminRoutes = Post.toAdminRoutes();
    console.log('ok', routes, homeRoutes);
    console.log('adminRotues', adminRoutes);
  });

  it('toRoute should return a valid route item', () => {
    const route = Post.toRoute({
      namespace: 'test',
      action: 'show',
      route: {
        meta: {
          requiresAuth: true,
          icon: 'my-icon',
        },
      },
    });
    console.log(route);
    expect(route.meta.requiresAuth).toBe(true);
  });
});
