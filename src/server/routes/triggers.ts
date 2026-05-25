import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  OnModActionRequest,
  OnPostSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { handleAppInstall } from '../triggers/appInstall';
import { handleModAction } from '../triggers/modAction';
import { handlePostSubmit } from '../triggers/postSubmit';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest | OnAppUpgradeRequest>();
    const result = await handleAppInstall(input);

    return c.json<TriggerResponse>(result, 200);
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

triggers.post('/on-post-submit', async (c) => {
  try {
    const input = await c.req.json<OnPostSubmitRequest>();
    const result = await handlePostSubmit(input);

    return c.json<TriggerResponse>(result, 200);
  } catch (error) {
    console.error(`Error handling post submit: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to handle post submit',
      },
      400
    );
  }
});

triggers.post('/on-mod-action', async (c) => {
  try {
    const input = await c.req.json<OnModActionRequest>();
    const result = await handleModAction(input);

    return c.json<TriggerResponse>(result, 200);
  } catch (error) {
    console.error(`Error handling mod action: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to handle mod action',
      },
      400
    );
  }
});
