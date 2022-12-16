import { formatErrors } from './utils';

describe('utils', () => {
  it('formatErrors', () => {
    const errors = {};
    expect(formatErrors(errors)).toBe(null);
    expect(formatErrors(undefined)).toBe(null);
    expect(
      formatErrors({
        user: ['cantblank'],
      })
    ).toEqual({ user: 'cantblank' });
  });
});
