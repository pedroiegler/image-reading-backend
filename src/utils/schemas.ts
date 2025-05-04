export const postUploadReadingSchema = {
  description: 'Responsável por receber uma imagem em base64, consultar o Gemini e retornar a medida lida pela API.',
  tags: ['POST /upload'],
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
      description: 'Operação realizada com sucesso',
    },
    400: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
        example: { type: 'string' },
      },
      description: 'Os dados fornecidos no corpo da requisição são inválidos',
      example: {
        error_code: 'INVALID_DATA',
        error_description: '<descrição do erro>',
      },
    },
    409: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Já existe uma leitura para este tipo no mês atual',
      example: {
        error_code: 'DOUBLE_REPORT',
        error_description: 'Leitura do mês já realizada',
      },
    },
    500: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Erro interno do servidor',
      example: {
        error_code: 'INTERNAL_ERROR',
        error_description: 'Ocorreu um erro interno no servidor',
      },
    }, 
  },
};

export const patchConfirmMeasuresSchema = {
  description: 'Responsável por confirmar ou corrigir o valor lido pelo LLM.',
  tags: ['PATCH /confirm'],
  body: {
    type: 'object',
    required: ['measure_uuid', 'confirmed_value'],
    properties: {
      measure_uuid: {
        type: 'string',
      },
      confirmed_value: { 
        type: 'integer' 
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' }
      },
      description: 'Operação realizada com sucesso',
    },
    400: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Os dados fornecidos no corpo da requisição são inválidos',
      example: {
        error_code: 'INVALID_DATA',
        error_description: '<descrição do erro>',
      },
    },
    404: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Leitura não encontrada',
      example: {
        error_code: 'MEASURE_NOT_FOUND',
        error_description: 'Leitura do mês não foi encontrada',
      },
    },
    409: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Leitura já confirmada',
      example: {
        error_code: 'CONFIRMATION_DUPLICATE',
        error_description: 'Leitura do mês já foi confirmada',
      },
    },
    500: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Erro interno do servidor',
      example: {
        error_code: 'INTERNAL_ERROR',
        error_description: 'Ocorreu um erro interno no servidor',
      },
    },
  },
};

export const getCustomerMeasuresSchema = {
  description: 'Responsável por listar as medidas realizadas por um determinado cliente.',
  tags: ['GET /<customer code>/list'],
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
        description: 'Filtro de tipo de medição (opcional)',
      },
    },
  },
  response: {
    200: {
      description: 'Operação realizada com sucesso',
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
      example: {
        customer_code: 'string',
        measures: [
          {
            measure_uuid: 'string',
            measure_datetime: '2025-04-26T21:20:00Z',
            measure_type: 'WATER',
            has_confirmed: true,
            image_url: 'https://example.com/image.jpg',
          },
          {
            measure_uuid: 'string',
            measure_datetime: '2025-04-26T21:20:00Z',
            measure_type: 'GAS',
            has_confirmed: false,
            image_url: 'https://example.com/image2.jpg',
          },
        ],
      },
    },
    400: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Parâmetro measure type diferente de WATER ou GAS',
      example: {
        error_code: 'INVALID_TYPE',
        error_description: 'Tipo de medição não permitida',
      },
    },
    404: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Nenhum registro encontrado',
      example: {
        error_code: 'MEASURES_NOT_FOUND',
        error_description: 'Nenhuma leitura encontrada',
      },
    },
    500: {
      type: 'object',
      properties: {
        error_code: { type: 'string' },
        error_description: { type: 'string' },
      },
      description: 'Erro interno do servidor',
      example: {
        error_code: 'INTERNAL_ERROR',
        error_description: 'Ocorreu um erro interno no servidor',
      },
    },
  },
};