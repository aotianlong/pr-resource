import Post from '@/resources/post';

describe('connection_spec', () => {
  const options = { fragments: 'withComments' };
  it('should be defined', () => {
    expect(Post.getConnection(options)).toBeDefined();
  });
});
