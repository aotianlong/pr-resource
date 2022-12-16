import schemaData from '@/auto_generated/schema.json';
import InputValue from './input-value';
// eslint-disable-next-line import/no-named-as-default
import Schema from '../schema';
import { Schema as RawSchema } from '../../types';

describe('input value', () => {
  const schema = new Schema(schemaData as RawSchema);
  const postsQuery = schema.getQuery('posts');
  const { first, last } = postsQuery.argumentsHash;
  it('should return default value', () => {
    expect(first.defaultValue).toBe(null);
    expect(first.name).toBe('first');
    expect(first.type.isNonNull).toBe(false);
  });
});
