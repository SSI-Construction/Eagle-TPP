"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function signInWithMicrosoft() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "email",
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push(searchParams.get("next") ?? "/schedule");
    router.refresh();
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicLinkSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Trade Schedule</CardTitle>
          <CardDescription>
            Sign in to view and book trade capacity across all projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="staff">
            <TabsList className="w-full">
              <TabsTrigger value="staff" className="flex-1">
                Staff
              </TabsTrigger>
              <TabsTrigger value="trade" className="flex-1">
                Trade partner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                PMs and site supervisors sign in with their company Microsoft account.
              </p>
              <Button className="w-full" onClick={signInWithMicrosoft} disabled={loading}>
                Sign in with Microsoft
              </Button>
            </TabsContent>

            <TabsContent value="trade" className="space-y-4 pt-4">
              {magicLinkSent ? (
                <p className="text-sm text-muted-foreground">
                  Check your email for a sign-in link.
                </p>
              ) : (
                <form className="space-y-3" onSubmit={signInWithPassword}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    disabled={loading || !email}
                    onClick={sendMagicLink}
                  >
                    Email me a sign-in link instead
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
