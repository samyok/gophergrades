import { MessageBuilder, Webhook } from "discord-webhook-node";

const hook = new Webhook(process.env.DISCORD_WEBHOOK);

export default async (req, res) => {
  const { body } = req;
  const { url, email, source } = body;

  if (!url) {
    res.status(400).end();
    return;
  }

  const embed = new MessageBuilder()
    .setTitle(`Missing URL: https://umn.lol${url}`)
    .setDescription(
      `Reported by ${email ? `${email}@umn.edu` : "unknown"} on the ${
        source ?? "??"
      }`
    )
    .setColor(0x5b0013)
    .setTimestamp();

  await hook.send(embed);

  res.status(200).json({ message: "Success" });
};
