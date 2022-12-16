import schemaData from '@/auto_generated/schema.json';
import Field from './field';
import Schema from '../schema';

describe('schema field class', () => {
  const schema = new Schema(schemaData);
  const post = schema.getType('Post');
  const { id, user, images, comments, visitors } = post.fieldsHash;
  it('it should return isScalar', () => {
    expect(id.isScalar).toBe(true);
    expect(user.isScalar).toBe(false);
    expect(images.isScalar).toBe(true);
  });

  it('it should return isNode', () => {
    expect(user.isNode).toBe(true);
    expect(user.type?.fullType).not.toBe(null);
  });

  it('should return toQueryString', () => {
    expect(id.toQueryString()).toBe('id');
    const visitorsStr = visitors.toQueryString();
    console.log(visitorsStr);
    expect(visitors.toQueryString()).toBe('id');
  });

  it('should return variable names', () => {
    const usersField = schema.getQuery('users');
    const variableNames = usersField?.toVariableNames();
    console.log(variableNames);
  });
});
