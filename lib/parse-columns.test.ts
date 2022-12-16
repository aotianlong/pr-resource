import '@/lib/configure-create-resource';
import User from '@/resources/user';
import parseColumns, { expandAbsoluteFragment } from './parse-columns';
import resourceClasses from './resource-classes';

describe('parse columns', () => {
  const fragments = {
    default: 'default',
    user: `
    id
    userId
    name
    title
    `,
    album() {
      return `
      id
      albumId
      albumName
      photosCount
      `;
    },
  };
  it('should parse columns', () => {
    const str = `
      +
      +album
      +user
    `;
    const result = parseColumns(str, fragments);
    console.log(result);
  });

  it('should expandAbsoluteFragment', () => {
    console.log('resourceclasses', resourceClasses);
    const result = expandAbsoluteFragment('User.default');
    // console.log(User.fragments.default);
    console.log(result);
  });
});
