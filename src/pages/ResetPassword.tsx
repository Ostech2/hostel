import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import ucuLogo from "@/assets/ucu-logo.png";

export default function ResetPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const { updatePassword, session } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // If there's no session, they shouldn't be here
        // Supabase handles the session via the link automatically
        if (!session) {
            const timeout = setTimeout(() => {
                if (!session) {
                    toast({
                        variant: "destructive",
                        title: "Access Denied",
                        description: "Invalid or expired reset link. Please request a new one.",
                    });
                    navigate("/auth");
                }
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [session, navigate, toast]);

    const handleUpdate = async (e: React.FormEvent) => {
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
                    <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
                    <p className="text-muted-foreground">Complete your account recovery</p>
                </div>

                <Card className="border-border/50 shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl">New Password</CardTitle>
                        <CardDescription>
                            Enter your new password below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdate} className="space-y-4">
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
