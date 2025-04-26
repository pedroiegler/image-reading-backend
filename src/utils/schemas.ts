export const uploadReadingSchema = {
    body: {
      type: 'object',
      required: ['image', 'customer_code', 'measure_datetime', 'measure_type'],
      properties: {
        image: {
          type: 'string',
          pattern: '^data:image\\/(png|jpeg|jpg);base64,',
        },
        customer_code: {
          type: 'string',
          minLength: 1,
        },
        measure_datetime: {
          type: 'string',
          format: 'date-time',
        },
        measure_type: {
          type: 'string',
          enum: ['WATER', 'GAS'],
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          image_url: { type: 'string' },
          measure_value: { type: 'integer' },
          measure_uuid: { type: 'string', format: 'uuid' },
        },
      },
      400: {
        type: 'object',
        properties: {
          error_code: { type: 'string' },
          error_description: { type: 'string' },
        },
      },
      409: {
        type: 'object',
        properties: {
          error_code: { type: 'string' },
          error_description: { type: 'string' },
        },
      },
    },
};

export const getCustomerMeasuresSchema = {
    description: 'Lista as leituras de um cliente, podendo filtrar por tipo de medição (WATER ou GAS)',
    tags: ['Leituras'],
    params: {
      type: 'object',
      properties: {
        customer_code: { type: 'string' },
      },
      required: ['customer_code'],
    },
    querystring: {
      type: 'object',
      properties: {
        measure_type: {
          type: 'string',
          enum: ['WATER', 'GAS'],
          description: 'Tipo de medição a ser filtrado (opcional)',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          customer_code: { type: 'string' },
          measures: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                measure_uuid: { type: 'string' },
                measure_datetime: { type: 'string', format: 'date-time' },
                measure_type: { type: 'string' },
                has_confirmed: { type: 'boolean' },
                image_url: { type: 'string' },
              },
            },
          },
        },
      },
      400: {
        type: 'object',
        properties: {
          error_code: { type: 'string' },
          error_description: { type: 'string' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error_code: { type: 'string' },
          error_description: { type: 'string' },
        },
      },
    },
};