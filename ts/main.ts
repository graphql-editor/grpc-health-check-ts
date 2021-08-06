// Credits for this code goes to original author.
// Checkout https://github.com/nicolaspearson/grpc.ts.health.check

import { HealthClient, HealthService, IHealthServer } from "./grpcgen";
import { HealthCheckRequest, HealthCheckResponse } from "./grpcgen";
import {
  UntypedHandleCall,
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
  Metadata,
} from "@grpc/grpc-js";
import GrpcBoom from "grpc-boom";

interface StatusMap {
  [key: string]: HealthCheckResponse.ServingStatus;
}

interface ErrorMap {
  [key: string]: Error;
}

interface HealthCheckService {
  statusMap: StatusMap;
  watchStatusMap: StatusMap;
  watchErrorMap: ErrorMap;
}

type CheckCallType = IHealthServer["check"];
type WatchCallType = IHealthServer["watch"];
type HealtchCheckServerUnaryCallArg = ServerUnaryCall<
  HealthCheckRequest,
  HealthCheckResponse
>;
type HealtchCheckServerWritableStream = ServerWritableStream<
  HealthCheckRequest,
  HealthCheckResponse
>;

function sendStatusResponse(
  call: HealtchCheckServerWritableStream,
  status: HealthCheckResponse.ServingStatus,
  callback?: (error: Error | null | undefined) => void
): void {
  // Send the status to the client
  const response = new HealthCheckResponse();
  response.setStatus(status);
  call.write(response, callback);
}

function check(svc: HealthCheckService): CheckCallType {
  return (
    call: HealtchCheckServerUnaryCallArg,
    callback: sendUnaryData<HealthCheckResponse>
  ): void => {
    const service = call.request.getService();
    const status = svc.statusMap[service];
    if (!status) {
      callback(GrpcBoom.notFound(`Unknown service: ${service}`), null);
    } else {
      const response = new HealthCheckResponse();
      response.setStatus(status);
      callback(null, response);
    }
  };
}

function watch(svc: HealthCheckService): WatchCallType {
  return (call: HealtchCheckServerWritableStream): void => {
    const service: string = call.request.getService();
    // tslint:disable no-console
    const interval = setInterval(() => {
      // Updated status is used for getting service status updates.
      let updatedStatus = HealthCheckResponse.ServingStatus.SERVING;
      if (!svc.statusMap[service]) {
        // Set the initial status
        updatedStatus = HealthCheckResponse.ServingStatus.SERVICE_UNKNOWN;
        svc.statusMap[service] = updatedStatus;
        sendStatusResponse(call, updatedStatus);
      }
      // Add to the watch status map
      svc.watchStatusMap[service] = updatedStatus;
      if (!svc.watchErrorMap[service]) {
        const lastStatus = svc.statusMap[service] || -1;
        if (lastStatus !== updatedStatus) {
          // Status has changed
          svc.statusMap[service] = updatedStatus;
          sendStatusResponse(
            call,
            updatedStatus,
            (error: Error | null | undefined) => {
              if (error) {
                // Terminate stream on next tick
                svc.watchErrorMap[service] = error;
              }
            }
          );
        }
      } else {
        clearInterval(interval);
        // Terminate the stream
        const metadata = new Metadata();
        metadata.set("error", svc.watchErrorMap[service].message);
        call.end(metadata);
      }
    }, 1000);
  };
}

export class GrpcHealthCheckServer implements IHealthServer {
  [key: string]: UntypedHandleCall;
  check: CheckCallType;
  watch: WatchCallType;
  constructor(svc: HealthCheckService) {
    this.check = check(svc);
    this.watch = watch(svc);
  }
}

class ServiceStatus {
  statusMap: StatusMap = {};
  watchStatusMap: StatusMap = {};
  watchErrorMap: ErrorMap = {};
}

export class GrpcHealthCheck {
  private serviceStatus = new ServiceStatus();
  server: IHealthServer;
  constructor(statusMap: StatusMap) {
    this.serviceStatus.statusMap = statusMap;
    this.server = new GrpcHealthCheckServer(this.serviceStatus);
  }
}

export { HealthCheckRequest, HealthCheckResponse, HealthClient, HealthService };
