"use client";

import { CallInterface } from "./CallInterface";
import { IncomingCallNotification } from "./IncomingCallNotification";

export function CallUI() {
  return (
    <>
      <CallInterface />
      <IncomingCallNotification />
    </>
  );
}
