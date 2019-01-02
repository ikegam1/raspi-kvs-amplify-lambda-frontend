// eslint-disable
// this is an auto generated file. This will be overwritten

export const scanMeasurements = `query listKamekusaDht22S {
  listKamekusaDht22S {
    items {
      expire
      id
      payload
    }
  }
}
`;

export const listMeasurements = `query listKamekusaDht22S(
  $filter: TableKamekusaDht22FilterInput
  $limit: Int
  $nextToken: String
) {
  listKamekusaDht22S(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      expire
      id
      payload
    }
    nextToken
  }
}
`;
