import schemaData from '@/auto_generated/schema.json';
import OfType from './of-type';
import Schema from '../schema';

describe('oftype', () => {
  const schema = new Schema(schemaData);
  const ofType = new OfType(schema, {
    kind: 'SCALAR',
    name: 'String',
    ofType: null,
  });

  const ofType2 = new OfType(schema, {
    kind: 'OBJECT',
    name: 'Post',
    ofType: null,
  });
  it('ofType should return correct attributes', () => {
    expect(ofType.isScalar).toBe(true);
    expect(ofType.isNonNull).toBe(false);
    expect(ofType.isList).toBe(false);
    expect(ofType.isListNonNull).toBe(false);
    expect(ofType.signature).toBe('String');
    expect(ofType.type.name).toBe('String');
    expect(ofType.fullType).toBe(null);
    expect(ofType.ofTypes).toEqual([
      { kind: 'SCALAR', name: 'String', ofType: null },
    ]);
    expect(ofType.type.kind).toBe('SCALAR');
  });

  it('ofType2 should return fullType', () => {
    expect(ofType2.fullType?.name).toBe('Post');
  });

  const ofType3 = new OfType(schema, {
    kind: 'NON_NULL',
    name: null,
    ofType: {
      kind: 'SCALAR',
      name: 'String',
      ofType: null,
    },
  });

  it('ofType3 signature should return correct', () => {
    expect(ofType3.signature).toBe('String!');
  });

  const ofType4 = new OfType(schema, {
    kind: 'NON_NULL',
    name: null,
    ofType: {
      kind: 'LIST',
      name: null,
      ofType: {
        kind: 'NON_NULL',
        name: null,
        ofType: {
          kind: 'SCALAR',
          name: 'String',
          ofType: null,
        },
      },
    },
  });

  it('ofType3 signature should return correct', () => {
    expect(ofType4.signature).toBe('[String!]!');
    expect(ofType4.isNonNull).toBe(true);
    expect(ofType4.isList).toBe(true);
    expect(ofType4.isListNonNull).toBe(true);
  });
});
