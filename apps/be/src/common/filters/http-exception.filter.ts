import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();

    // pipe나 controller에서 던진 에러의 내용을 가져옴 (문자열 or 에러 객체)
    const exceptionResponse = exception.getResponse();

    const responseBody: any = {
      code: exception.name,
      message: exception.message,
    };

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const errorObj = exceptionResponse as any;

      // 커스텀 에러 코드가 있으면 덮어쓰기
      if (errorObj.code) {
        responseBody.code = errorObj.code;
      }

      // 메시지 덮어쓰기
      if (errorObj.message) {
        responseBody.message = errorObj.message;
      }

      // Validation 상세 에러가 있으면 추가
      if (errorObj.errors) {
        responseBody.errors = errorObj.errors;
      }
    }
    res.status(status).json(responseBody);
  }
}
