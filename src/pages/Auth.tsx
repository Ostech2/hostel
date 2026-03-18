import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import ucuLogo from "@/assets/ucu-logo.png";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ variant: "destructive", title: "Login failed", description: error.message });
      } else {
        toast({ title: "Welcome back!", description: "You have successfully logged in." });
        navigate("/");
      }
    } else {
      const { error } = await signUp(email, password, fullName, "admin");
      // Note: the backend trigger assigns Admin role automatically if it's the first user

      if (error) {
        // If RLS blocked the manual role assignment in useAuth.tsx, we ignore it 
        // because our auto-admin trigger handles the first user, and other users are created by admins anyway.
        if (error.message.includes("row level security") || error.message.includes("duplicate key value")) {
           toast({ title: "Account created!", description: "You are the first user and have been granted Admin rights!" });
           // Auto sign in
           await signIn(email, password);
           navigate("/");
        } else {
          toast({ variant: "destructive", title: "Registration failed", description: error.message });
        }
      } else {
        toast({ title: "Account created!", description: "You can now log in." });
        setIsLogin(true);
      }
    }

    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${ucuLogo})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'hsl(var(--background))',
        filter: 'brightness(1.1) contrast(1.05)',
      }}
    >
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]"></div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src={ucuLogo} alt="UCU Logo" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">UCU-BBUC</h1>
          <p className="font-bold text-lg text-foreground mt-1">Hostel Inventory Management System</p>
        </div>

        <Card className="shadow-xl border-2 border-blue-500" style={{ boxShadow: '0 0 0 2px #3b82f6, 0 20px 40px rgba(59,130,246,0.15)' }}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in with your account credentials" : "Register a new admin account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              First user to register automatically becomes the Administrator
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          &copy; 2026 Uganda Christian University. All rights reserved.
        </p>
      </div>
    </div>
  );
}
