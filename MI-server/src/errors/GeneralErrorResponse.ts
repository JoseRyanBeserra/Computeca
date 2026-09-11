// src/errors/GeneralErrorResponse.ts
import type { StatusCodeValue } from '../utils/statusCode'

/** Parâmetros de mensagem e código — produzidos por buildError() */
export interface ErrorParams {
  message: string
  code: string
}

export class GeneralErrorResponse extends Error {
  public readonly statusCode: StatusCodeValue
  public readonly code: string

  constructor(statusCode: StatusCodeValue, { message, code }: ErrorParams) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'GeneralErrorResponse'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
