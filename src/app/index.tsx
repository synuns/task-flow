import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { createAppQueryClient } from "./query-client";
import { appRouter } from "./router";
import { AuthProvider } from "./auth/auth-provider";
import { AuthenticatedApiBridge } from "./auth/authenticated-api-bridge";

const queryClient = createAppQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider queryClient={queryClient}>
        <AuthenticatedApiBridge>
          <RouterProvider router={appRouter} />
        </AuthenticatedApiBridge>
      </AuthProvider>
    </QueryClientProvider>
  );
}
