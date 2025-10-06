import { rng1, seed } from "./data";
import { Hero } from "./Hero";
import { generateItem } from "./Shape";
import { initUI } from "./ui";

seed(1)

let heroes = [
  new Hero("Knight", 10).getRandomItems("sword", "shield", "plate"),
  new Hero("Wizard", 10).getRandomItems("orb", "amulet", "robe"),
  new Hero("Rogue", 10).getRandomItems("dagger", "boots", "leather")
]


;[...new Array(20)].map(_ => generateItem(5 + rng1(10), rng1))

initUI(
  generateItem(10, rng1), 
  heroes  
);



//console.log(heroes);
//console.log(heroes[0].findBestEnemy());

for (let i = 0; i < 100; i++) {
  //console.log(generateWordBonus(3));
  //let it = generateItem(i, rng1);
  //console.log(it);
}


