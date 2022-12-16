import schemaData from '@/auto_generated/schema.json';
import _ from 'lodash';
import Type from './type';
import Schema from '../schema';

describe('Schema', () => {
  const schema = new Schema(schemaData);
  const type = schema.getType('Post');

  it('should have the expected fields', () => {
    console.log(type.fields);
    expect(type.isConnection).toBe(false);
    expect(type.isList).toBe(false);
    expect(type.isScalar).toBe(false);
    expect(type.isNonNull).toBe(false);
    expect(type.isUnion).toBe(false);
    expect(type.isEnum).toBe(false);
  });

  it('should toQueryString', () => {
    const queryString = type.toQueryString({ maxDepth: 3 });
    console.log(queryString);
    expect(queryString).toBe('Post');
  });

  it('expand columns', () => {
    expect(type.expandColumns()).toEqual([]);
  });

  it('should return fragments', () => {
    console.log(type.toFragments());
    // expect(type.toFragments()).toEqual({});
  });

  it('should return fild names', () => {
    expect(type.fieldNames).includes('id');
  });
});
