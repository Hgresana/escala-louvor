"use client";

import { createAuthClient } from "better-auth/react";

// Sem baseURL: usa a origem atual (funciona em localhost, no domínio da VPS e no PWA instalado).
export const authClient = createAuthClient();
