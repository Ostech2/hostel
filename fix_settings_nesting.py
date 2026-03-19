import sys
import os

path = r'd:\inventory\src\pages\Settings.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The incorrect snippet from my previous python script insertion
incorrect_snippet = '''                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="gap-2 mr-2" 
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                    >
                      {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Test Connection
                    </Button>
                    <Button className="gap-2">'''

# The correct layout
correct_snippet = '''                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="gap-2" 
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                    >
                      {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Test Connection
                    </Button>
                    <DialogTrigger asChild>
                      <Button className="gap-2">'''

if incorrect_snippet in content:
    content = content.replace(incorrect_snippet, correct_snippet)
    # Also need to close the div after DialogTrigger
    content = content.replace('</DialogTrigger>', '</DialogTrigger></div>')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("INCORRECT SNIPPET NOT FOUND")
