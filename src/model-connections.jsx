import React, {useEffect, useState} from 'react';
import {Button, Form, Input, App} from 'antd';
import {listModels, putModelConnections} from './api.mjs';
import {modelConnections} from './model-connections.mjs';
import './model-connections.css';

export default function ModelConnections({models, onSaved, onManage}) {
  const {message}=App.useApp();
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[saving,setSaving]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let alive=true;
    setLoading(true);setFailed(false);setRows([]);
    listModels().then(available=>{if(alive)setRows(modelConnections(models,available))})
      .catch(()=>{if(alive)setFailed(true)}).finally(()=>{if(alive)setLoading(false)});
    return()=>{alive=false};
  },[models,attempt]);
  const update=(id,patch)=>setRows(previous=>previous.map(row=>row.id===id?{...row,...patch}:row));
  const save=async()=>{
    for(const row of rows){
      if(!row.connectionName.trim()){message.warning(`请填写 ${row.name} 的连接名称`);return}
      try{const url=new URL(row.baseUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error()}
      catch{message.warning(`请填写 ${row.name} 的有效服务地址（HTTP 或 HTTPS）`);return}
    }
    setSaving(true);
    try{
      await putModelConnections(rows.map(({keyConfigured,...row})=>({...row,connectionName:row.connectionName.trim(),baseUrl:row.baseUrl.trim(),apiKey:row.apiKey?.trim()||undefined})));
      setRows(previous=>previous.map(({apiKey,...row})=>({...row,keyConfigured:!!apiKey?.trim()||row.keyConfigured})));
      onSaved(rows.map(row=>row.id));message.success('模型连接配置已保存');
    }catch{message.error('保存失败，请确认后端已启动后重试')}
    finally{setSaving(false)}
  };
  if(!models.length)return <div className="connection-empty"><p>请先选择需要配置的模型</p><Button type="primary" onClick={onManage}>管理模型列表</Button></div>;
  if(loading)return <p role="status" className="drawer-intro">正在读取模型连接配置…</p>;
  if(failed)return <div className="connection-empty" role="alert"><p>无法读取连接配置，请确认后端已启动。</p><Button onClick={()=>setAttempt(n=>n+1)}>重新加载</Button></div>;
  return <>
    <p className="drawer-intro">为当前选中的 {rows.length} 个模型分别配置连接。密钥保存在后端，不回显完整内容。</p>
    <Form layout="vertical" disabled={saving}>
      {rows.map(row=><section className="model-connection-group" key={row.id} aria-label={`${row.name}连接配置`}>
        <h3>{row.name}</h3>
        <Form.Item label="连接名称" required><Input className="soft-focus-field" aria-label={`${row.name}连接名称`} value={row.connectionName} onChange={e=>update(row.id,{connectionName:e.target.value})}/></Form.Item>
        <Form.Item label="服务地址" required><Input className="soft-focus-field" aria-label={`${row.name}服务地址`} placeholder="https://api.example.com/v1" value={row.baseUrl} onChange={e=>update(row.id,{baseUrl:e.target.value})}/></Form.Item>
        <Form.Item label={`${row.name} API Key`} extra={row.keyConfigured?'已配置 · 留空保留，输入新值可替换':'未配置'}><Input.Password className="soft-focus-field" aria-label={`${row.name} API Key`} autoComplete="new-password" placeholder={`粘贴 ${row.name} 的 API Key`} value={row.apiKey||''} onChange={e=>update(row.id,{apiKey:e.target.value})}/></Form.Item>
      </section>)}
      <Button type="primary" block loading={saving} onClick={save}>保存连接配置</Button>
    </Form>
    <p className="drawer-intro">保存配置后可用于后续对比；保存不代表服务已验证可用。</p>
    <Button block disabled={saving} onClick={onManage}>管理模型列表</Button>
  </>;
}
