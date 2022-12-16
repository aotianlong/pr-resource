import gql from 'graphql-tag';
import { AbilityVariables } from 'pr-resource/types';
import config from '../config';

function ability(variables: AbilityVariables) {
  const { id, type, name } = variables;
  const { apollo } = config;
  const query = `
  query ability($id: NodeId, $type: String, $name: String!) {
    ability(id: $id, type: $type, name: $name)
  }
  `;
  return apollo
    .query({
      query: gql`
        ${query}
      `,
      variables,
    })
    .then((response: any) => {
      return response.data.ability;
    })
    .catch((error: any) => {
      console.log('ability error', error);
      return false;
    });
}

export default ability;
