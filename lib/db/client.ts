import { env } from 'cloudflare:workers'

type SqlValue = string | number | boolean | null | ArrayBuffer | ArrayBufferView

function toSqlValue(value: unknown): SqlValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  ) {
    return value
  }

  throw new TypeError(`Unsupported D1 query parameter: ${typeof value}`)
}

export async function sql<Row = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Row[] }> {
  const query = strings.reduce(
    (statement, part, index) => statement + part + (index < values.length ? '?' : ''),
    '',
  )
  const result = await env.DB.prepare(query)
    .bind(...values.map(toSqlValue))
    .all<Row>()

  return { rows: result.results ?? [] }
}
