const test = require('node:test');
const assert = require('node:assert/strict');
const { getCostUsd } = require('../services/aiUsage');

test('estimates request cost using configured input and output rates', () => {
  const previousInputRate = process.env.AI_INPUT_COST_PER_MILLION_USD;
  const previousOutputRate = process.env.AI_OUTPUT_COST_PER_MILLION_USD;
  process.env.AI_INPUT_COST_PER_MILLION_USD = '2';
  process.env.AI_OUTPUT_COST_PER_MILLION_USD = '4';

  try {
    assert.equal(getCostUsd(100, 50), 0.0004);
  } finally {
    if (previousInputRate === undefined) delete process.env.AI_INPUT_COST_PER_MILLION_USD;
    else process.env.AI_INPUT_COST_PER_MILLION_USD = previousInputRate;
    if (previousOutputRate === undefined) delete process.env.AI_OUTPUT_COST_PER_MILLION_USD;
    else process.env.AI_OUTPUT_COST_PER_MILLION_USD = previousOutputRate;
  }
});

test('defaults local-model request cost to zero', () => {
  const previousInputRate = process.env.AI_INPUT_COST_PER_MILLION_USD;
  const previousOutputRate = process.env.AI_OUTPUT_COST_PER_MILLION_USD;
  delete process.env.AI_INPUT_COST_PER_MILLION_USD;
  delete process.env.AI_OUTPUT_COST_PER_MILLION_USD;

  try {
    assert.equal(getCostUsd(1000, 1000), 0);
  } finally {
    if (previousInputRate !== undefined) process.env.AI_INPUT_COST_PER_MILLION_USD = previousInputRate;
    if (previousOutputRate !== undefined) process.env.AI_OUTPUT_COST_PER_MILLION_USD = previousOutputRate;
  }
});
