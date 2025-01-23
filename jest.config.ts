// eslint-disable-next-line import/no-anonymous-default-export
export default {
  preset: 'ts-jest',
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          transform: {
            react: {
              runtime: 'automatic'
            }
          }
        }
      }
    ]
  },
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/admin/ui'
  },
  transformIgnorePatterns: ['node_modules/(?!axios|lit-element|lit-html|lit|@lit/|@shoelace)'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js'
  },
  globals: { TextEncoder: TextEncoder, TextDecoder: TextDecoder },
};
