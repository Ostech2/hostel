import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import ucuLogo from "@/assets/ucu-logo.png";

type ResetStep = "request" | "verify" | "reset";

export default function ForgotPassword() {
    const [step, setStep] = useState<ResetStep>("request");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const { resetPassword, updatePassword, session } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // Detect if we landed here with a recovery session
        if (session) {
            setStep("reset");
        } else if (window.location.hash.includes("type=recovery") || window.location.hash.includes("error=access_denied")) {
            // Fallback for when session isn't loaded yet but hash is present
            // AuthProvider handles the session creation, we just wait for it.
        }
    }, [session]);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { error } = await resetPassword(email);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } else {
            toast({
                title: "Reset link sent!",
                description: "Please check your email for the password reset link.",
            });
            setStep("verify");
        }

        setIsLoading(false);
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Validation error",
                description: "Passwords do not match.",
            });
            return;
        }

        setIsLoading(true);

        const { error } = await updatePassword(password);

        if (error) {
            toast({
                variant: "destructive",
                title: "Password update failed",
                description: error.message,
            });
        } else {
            toast({
                title: "Success",
                description: "Your password has been updated successfully.",
            });
            navigate("/auth");
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
            }}
        >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <img src={ucuLogo} alt="UCU Logo" className="h-20 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-foreground">Password Recovery</h1>
                    <p className="text-muted-foreground">Secure your account access</p>
                </div>

                <Card className="border-border/50 shadow-xl">
                    <CardHeader className="text-center pb-4">
                        {step === "request" && (
                            <>
                                <CardTitle className="text-xl">Forgot Password?</CardTitle>
                                <CardDescription>
                                    Enter your email address and we'll send you a link to reset your password.
                                </CardDescription>
                            </>
                        )}
                        {step === "verify" && (
                            <>
                                <CardTitle className="text-xl flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                    Link Sent
                                </CardTitle>
                                <CardDescription>
                                    Protect your account by checking your email. Click the link we sent to {email} to continue here.
                                </CardDescription>
                            </>
                        )}
                        {step === "reset" && (
                            <>
                                <CardTitle className="text-xl">Set New Password</CardTitle>
                                <CardDescription>
                                    Authenticated successfully. Enter your new secure password below.
                                </CardDescription>
                            </>
                        )}
                    </CardHeader>
                    <CardContent>
                        {step === "request" && (
                            <form onSubmit={handleResetRequest} className="space-y-4">
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
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Send Reset Link
                                </Button>
                                <Button
                                    variant="link"
                                    className="w-full text-muted-foreground"
                                    onClick={() => navigate("/auth")}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Login
                                </Button>
                            </form>
                        )}

                        {step === "verify" && (
                            <div className="space-y-6">
                                <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground border border-dashed border-border">
                                    <p className="mb-2"><strong>What next?</strong></p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Open your GMail account</li>
                                        <li>Find the password reset email</li>
                                        <li>Click the <strong>Reset Password</strong> button</li>
                                        <li>This window will automatically refresh</li>
                                    </ol>
                                </div>

                                <div className="space-y-4 opacity-50 pointer-events-none">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <Input disabled type="password" placeholder="Waiting for link click..." />
                                    </div>
                                    <Button disabled className="w-full">Update Password (Disabled)</Button>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setStep("request")}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Use a different email
                                </Button>
                            </div>
                        )}

                        {step === "reset" && (
                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter new password"
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
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Update Password
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
