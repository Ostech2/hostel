import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import ucuLogo from "@/assets/ucu-logo.png";

export default function ForgotPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const { resetPassword } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleReset = async (e: React.FormEvent) => {
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
                    <h1 className="text-2xl font-bold text-foreground">Forgot Password</h1>
                    <p className="text-muted-foreground">Reset your account access</p>
                </div>

                <Card className="border-border/50 shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl">Request Reset Link</CardTitle>
                        <CardDescription>
                            Enter your email address and we'll send you a link to reset your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleReset} className="space-y-4">
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
                        </form>
                        <Button
                            variant="link"
                            className="w-full mt-4 text-muted-foreground"
                            onClick={() => navigate("/auth")}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
