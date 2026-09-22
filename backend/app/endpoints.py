from urllib.parse import urlsplit


def service_address(address):
    address = address.strip().rstrip('/')
    parsed = urlsplit(address)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('服务地址无效，请填写不含凭据的 HTTP(S) API 地址。')
    if parsed.hostname == 'platform.deepseek.com':
        raise ValueError('这是 DeepSeek 控制台网页，请将服务地址改为 https://api.deepseek.com。')
    if parsed.hostname == 'maas.antdigital.com':
        raise ValueError('这是蚂蚁 MaaS 控制台网页，请将服务地址改为 https://maas-api.antdigital.com/v1。')
    return address


def completion_url(address):
    address = service_address(address)
    return address if urlsplit(address).path.endswith('/chat/completions') else address + '/chat/completions'
