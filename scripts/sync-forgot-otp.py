import os

web_base = r'c:\Users\panig\OneDrive\Desktop\SecureChat'
mobile_base = r'c:\Users\panig\OneDrive\Desktop\SecureChatMobile'

# 1. AuthModal.jsx
auth_src = os.path.join(web_base, 'src', 'components', 'AuthModal.jsx')
auth_dest = os.path.join(mobile_base, 'src', 'components', 'AuthModal.jsx')
with open(auth_src, 'r', encoding='utf-8') as f:
    auth_code = f.read()

auth_code = auth_code.replace("source: 'SecureChat'", "source: 'SecureChatMobile'")

with open(auth_dest, 'w', encoding='utf-8') as f:
    f.write(auth_code)
print('Synced AuthModal.jsx to SecureChatMobile')

# 2. api.js
api_src = os.path.join(web_base, 'src', 'utils', 'api.js')
api_dest = os.path.join(mobile_base, 'src', 'utils', 'api.js')
with open(api_src, 'r', encoding='utf-8') as f:
    api_code = f.read()

with open(api_dest, 'w', encoding='utf-8') as f:
    f.write(api_code)
print('Synced api.js to SecureChatMobile')

# 3. server.js
server_src = os.path.join(web_base, 'server.js')
server_dest = os.path.join(mobile_base, 'server.js')
with open(server_src, 'r', encoding='utf-8') as f:
    server_code = f.read()

with open(server_dest, 'w', encoding='utf-8') as f:
    f.write(server_code)
print('Synced server.js to SecureChatMobile')

# 4. .env
env_src = os.path.join(web_base, '.env')
env_dest = os.path.join(mobile_base, '.env')
with open(env_src, 'r', encoding='utf-8') as f:
    env_code = f.read()

with open(env_dest, 'w', encoding='utf-8') as f:
    f.write(env_code)
print('Synced .env to SecureChatMobile')
