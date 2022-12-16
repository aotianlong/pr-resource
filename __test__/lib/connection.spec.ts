import Post from '@/resources/post';
import { Connection } from '../../lib/connection';

describe('connection', () => {
  it('should create a connection', async () => {
    const connection = new Connection(Post);
    console.log(connection);
    const postsConnection = await connection.loadMore();
    console.log(postsConnection);
    console.log((postsConnection as Connection).nodes[0].attributes);
  });
});
