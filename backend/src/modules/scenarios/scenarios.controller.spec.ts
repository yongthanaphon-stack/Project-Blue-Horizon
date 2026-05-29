import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ScenariosController } from './scenarios.controller';

function controllerMethod(name: keyof ScenariosController): object {
  const descriptor = Object.getOwnPropertyDescriptor(
    ScenariosController.prototype,
    name,
  );
  const value: unknown = descriptor?.value;

  if (typeof value !== 'function') {
    throw new Error(`Missing controller method: ${String(name)}`);
  }

  return value;
}

describe('ScenariosController routes', () => {
  it('keeps scenario routes under the shared API prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ScenariosController)).toBe(
      'api/scenarios',
    );
  });

  it('keeps the existing selection routes used by the frontend', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, controllerMethod('selectScenarios')),
    ).toBe('selected');
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerMethod('selectScenarios')),
    ).toBe(RequestMethod.PUT);

    expect(
      Reflect.getMetadata(PATH_METADATA, controllerMethod('selectScenario')),
    ).toBe(':id/select');
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerMethod('selectScenario')),
    ).toBe(RequestMethod.PUT);
  });

  it('exposes AI generation through the API-backed scenarios client', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, controllerMethod('generateWithAI')),
    ).toBe(':workshopId/generate-ai');
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerMethod('generateWithAI')),
    ).toBe(RequestMethod.POST);
  });

  it('exposes scenario editing through an item-level update route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, controllerMethod('update'))).toBe(
      ':id',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerMethod('update')),
    ).toBe(RequestMethod.PUT);
  });
});
