from typing import List
from pydantic import BaseModel, Field


class CompareRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=20000)
    systemPrompt: str = Field("", max_length=20000)
    modelIds: List[str] = Field(..., min_length=1)
    stream: bool = True


from urllib.parse import urlsplit
from pydantic import field_validator


class ModelConnection(BaseModel):
    id: str = Field(min_length=1, max_length=200, pattern=r"^connection:")
    name: str = Field(min_length=1, max_length=200)
    provider: str = Field(default="自定义", max_length=200)
    modelId: str = Field(min_length=1, max_length=200)
    connectionName: str = Field(min_length=1, max_length=200)
    baseUrl: str = Field(min_length=1, max_length=2000)
    apiKey: str | None = Field(default=None, max_length=8192, repr=False)
    inheritFrom: str | None = None

    @field_validator("name", "modelId", "connectionName")
    @classmethod
    def nonempty(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("字段不能为空")
        return value

    @field_validator("baseUrl")
    @classmethod
    def service_url(cls, value):
        value = value.strip().rstrip("/")
        parsed = urlsplit(value)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("服务地址必须为不包含凭据、查询或片段的 HTTP(S) 地址")
        return value


class SettingsRequest(BaseModel):
    keys: dict[str, str] = Field(default_factory=dict)
    connections: list[ModelConnection] = Field(default_factory=list, max_length=9)
