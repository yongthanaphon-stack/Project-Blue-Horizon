import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ScenariosController } from './scenarios.controller';

describe('ScenariosController routes', () => {
  const controllerPrototype = ScenariosController.prototype as any;

  it('keeps scenario routes under the shared API prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ScenariosController)).toBe(
      'api/scenarios',
    );
  });

  it('keeps the existing selection routes used by the frontend', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, controllerPrototype.selectScenarios),
    ).toBe('selected');
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerPrototype.selectScenarios),
    ).toBe(RequestMethod.PUT);

    expect(
      Reflect.getMetadata(PATH_METADATA, controllerPrototype.selectScenario),
    ).toBe(':id/select');
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerPrototype.selectScenario),
    ).toBe(RequestMethod.PUT);
  });

  it('exposes AI generation through the API-backed scenarios client', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, controllerPrototype.generateWithAI),
    ).toBe(':workshopId/generate-ai');
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerPrototype.generateWithAI),
    ).toBe(RequestMethod.POST);
  });

  it('exposes scenario editing through an item-level update route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, controllerPrototype.update)).toBe(
      ':id',
    );
    expect(
      Reflect.getMetadata(METHOD_METADATA, controllerPrototype.update),
    ).toBe(RequestMethod.PUT);
  });
});
