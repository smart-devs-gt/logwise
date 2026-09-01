import 'reflect-metadata';
import { Controller, Get, registerRoutes } from '../decorators/route.decorator';

/**
 * `registerRoutes` montaba el handler como `(req, res) => controller.metodo(req, res)`.
 *
 * Sin `next`, un controller que hace `catch (e) { next(e) }` lanzaba
 * `TypeError: next is not a function` dentro de una promesa: rejection sin
 * manejar, error handler nunca invocado, y **la respuesta jamás emitida**. La
 * request quedaba colgada hasta el timeout del cliente.
 */
describe('registerRoutes propaga next', () => {
  /** Router mínimo que sólo guarda lo que se registra. */
  const routerFalso = () => {
    const registrados: Record<string, (req: any, res: any, next: any) => unknown> = {};
    const capturar = (metodo: string) => (path: string, handler: any) => {
      registrados[`${metodo} ${path}`] = handler;
    };
    return {
      registrados,
      get: capturar('get'),
      post: capturar('post'),
      put: capturar('put'),
      patch: capturar('patch'),
      delete: capturar('delete'),
    };
  };

  it('le pasa next al método del controller', async () => {
    let recibido: unknown = 'no invocado';

    @Controller('/demo')
    class DemoController {
      @Get('/')
      async index(_req: any, _res: any, next: any) { recibido = next; }
    }

    const router = routerFalso();
    registerRoutes(router as never, new DemoController(), { verbose: false });

    const next = jest.fn();
    await router.registrados['get /']?.({}, {}, next);

    expect(recibido).toBe(next);
  });

  it('deriva a next el error de un handler async que rechaza', async () => {
    const error = new Error('mongo caido');

    @Controller('/demo')
    class DemoController {
      @Get('/')
      async index() { throw error; }
    }

    const router = routerFalso();
    registerRoutes(router as never, new DemoController(), { verbose: false });

    const next = jest.fn();
    await router.registrados['get /']?.({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('deriva a next el error que el controller pasa a mano', async () => {
    const error = new Error('falla controlada');

    @Controller('/demo')
    class DemoController {
      @Get('/')
      async index(_req: any, _res: any, next: any) { next(error); }
    }

    const router = routerFalso();
    registerRoutes(router as never, new DemoController(), { verbose: false });

    const next = jest.fn();
    await router.registrados['get /']?.({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('un handler que responde bien no toca next', async () => {
    @Controller('/demo')
    class DemoController {
      @Get('/')
      async index(_req: any, res: any) { res.ok = true; }
    }

    const router = routerFalso();
    registerRoutes(router as never, new DemoController(), { verbose: false });

    const res: any = {};
    const next = jest.fn();
    await router.registrados['get /']?.({}, res, next);

    expect(res.ok).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});
