import QueryDefinition from "./queryKinds/query.js";
import SelectQuery from "./queryKinds/select.js";

export class Cte {
  private name: string;
  private query: QueryDefinition;
  private recursiveCte: boolean;

  constructor(
    name?: string, 
    query?: QueryDefinition,
    recursive: boolean = false
  ) {
    this.name = name || '';
    this.query = query || new SelectQuery();
    this.recursiveCte = recursive;
  }

  public recursive(): this {
    this.recursiveCte = true;
    return this;
  }

  public as(name: string): this {
    this.name = name;
    return this;
  }

  public withQuery(query: SelectQuery): this {
    this.query = query;
    return this;
  }

  public build(): { text: string; values: any[] } {
    const recursiveStr = this.recursiveCte ? 'RECURSIVE ' : '';
    const query = this.query.build();
    return {
      text: `${recursiveStr}${this.name} AS (\n${query.text}\n)`,
      values: query.values
    };
  }
}

export default class CteMaker {
  private ctes: Cte[] = [];

  constructor(...ctes: Cte[]) {
    this.ctes = ctes;
  }

  public addCte(cte: Cte): this {
    this.ctes.push(cte);
    return this;
  }

  public addCtes(ctes: Cte[]): this {
    this.ctes.push(...ctes);
    return this;
  }

  public build(): { text: string; values: any[] } {
    if (this.ctes.length === 0) {
      return { text: '', values: [] };
    }

    const cteResults: Array<{ text: string; values: any[] }> = [];
    let paramIndex = 1;

    // Build each CTE and renumber its parameters
    for (const cte of this.ctes) {
      const builtCte = cte.build();
      
      // Renumber parameters in this CTE's text
      const renumberedText = builtCte.text.replace(/\$(\d+)/g, () => {
        return `$${paramIndex++}`;
      });

      cteResults.push({
        text: renumberedText,
        values: builtCte.values
      });
    }

    return {
      text: `WITH ${cteResults.map(r => r.text).join(', ')}`,
      values: cteResults.flatMap(r => r.values)
    };
  }
}
