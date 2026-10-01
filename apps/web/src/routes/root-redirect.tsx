import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { login } from "@/lib/api.js";
import { useMe } from "@/lib/queries.js";

// Blank redirect hub for "/": authenticated users go to /level-configuration,
// everyone else is sent to the Keycloak login. Renders nothing itself.
function RootRedirect() {
  const { data: me, isPending } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPending) return;
    if (me) {
      void navigate({ to: "/level-configuration", replace: true });
    } else {
      login();
    }
  }, [isPending, me, navigate]);

  return null;
}

export { RootRedirect };
