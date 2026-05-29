import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

/** Configuración para el procesador XML */
export interface XmlConfig {
  ignoreAttributes?: boolean;
  attributeNamePrefix?: string;
  allowBooleanAttributes?: boolean;
  parseTagValue?: boolean;
}

export class XmlProcessor {
  private parser: XMLParser;
  private builder: XMLBuilder;
  private validator: typeof XMLValidator;

  constructor(config?: XmlConfig) {
    this.parser = new XMLParser(config);
    this.builder = new XMLBuilder(config);
    this.validator = XMLValidator;
  }

  parse(xmlString: string): any {
    return this.parser.parse(xmlString);
  }

  build(jsonObj: any): string {
    return this.builder.build(jsonObj);
  }

  validate(xmlString: string): boolean {
    return this.validator.validate(xmlString) === true;
  }
}
