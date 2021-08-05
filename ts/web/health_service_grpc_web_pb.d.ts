import * as grpcWeb from 'grpc-web';

import * as health_service_pb from './health_service_pb';


export class HealthClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; });

  check(
    request: health_service_pb.HealthCheckRequest,
    metadata: grpcWeb.Metadata | undefined,
    callback: (err: grpcWeb.Error,
               response: health_service_pb.HealthCheckResponse) => void
  ): grpcWeb.ClientReadableStream<health_service_pb.HealthCheckResponse>;

  watch(
    request: health_service_pb.HealthCheckRequest,
    metadata?: grpcWeb.Metadata
  ): grpcWeb.ClientReadableStream<health_service_pb.HealthCheckResponse>;

}

export class HealthPromiseClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; });

  check(
    request: health_service_pb.HealthCheckRequest,
    metadata?: grpcWeb.Metadata
  ): Promise<health_service_pb.HealthCheckResponse>;

  watch(
    request: health_service_pb.HealthCheckRequest,
    metadata?: grpcWeb.Metadata
  ): grpcWeb.ClientReadableStream<health_service_pb.HealthCheckResponse>;

}

