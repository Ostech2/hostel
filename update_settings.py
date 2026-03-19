import sys
import os

path = r'd:\inventory\src\pages\Settings.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    # 1. Add state variable
    if 'const [isCreatingUser, setIsCreatingUser] = useState(false);' in line:
        new_lines.append('  const [isTestingConnection, setIsTestingConnection] = useState(false);\n')
    
    # 2. Add handler function
    if 'const handleCreateUser = async () => {' in line:
        # Move back to insert BEFORE handleCreateUser
        test_func = '''  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("create-user", {
        body: { action: "test" },
      });
      
      if (invokeError) {
        const errorMsg = data?.error || data?.message || data?.msg || invokeError.message;
        throw new Error(errorMsg);
      }
      
      if (data?.error || data?.message || data?.msg) {
        if (!data.success) throw new Error(data.error || data.message || data.msg);
      }

      toast({ title: "Success", description: data?.message || "Edge Function is reachable" });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Edge Function",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };\n\n'''
        # We need to insert before the current line
        new_lines.insert(-1, test_func)

    # 3. Add UI button
    if '<Button className="gap-2">' in line and '<UserPlus className="h-4 w-4" />' in lines[lines.index(line)+1]:
        test_button = '''                    <Button 
                      variant="outline" 
                      className="gap-2 mr-2" 
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                    >
                      {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Test Connection
                    </Button>\n'''
        new_lines.insert(-1, test_button)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('SUCCESS')
