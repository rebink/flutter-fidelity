import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { VERSION } from '../src/version.js';
test('built MCP starts over stdio with no stdout contamination', async t => {
  const client=new Client({name:'stdio-verifier',version:'1.0.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[path.resolve('dist/cli.js'),'mcp'],stderr:'pipe'});
  await client.connect(transport);
  t.after(async()=>{await client.close();});
  assert.equal(client.getServerVersion()?.version, VERSION);
  const {tools}=await client.listTools();
  assert.ok(tools.some(tool => tool.name === 'record_iteration'));
  assert.ok(tools.some(tool => tool.name === 'verify_source_checkpoint'));
  const result=await client.callTool({name:'suggest_viewport',arguments:{image:path.resolve('fixtures/screens/complete-screen.png')}});
  const content=result.content as {type:string;text?:string}[];
  assert.equal(result.isError,undefined); assert.equal(JSON.parse(content[0]!.text!).confirmed,false);
});
